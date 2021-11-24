CREATE TABLE [dbo].[ProjectRatings]
(
[ProjectRatingsId] [int] NOT NULL IDENTITY(1, 1),
[ProjectRatings] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ProjectRatings] ADD CONSTRAINT [CK_ProjectRatings] CHECK (([ProjectRatings]='Not Rated' OR [ProjectRatings]='Needs Improvement' OR [ProjectRatings]=' Average' OR [ProjectRatings]='Above Average' OR [ProjectRatings]='Exceptional'))
GO
ALTER TABLE [dbo].[ProjectRatings] ADD CONSTRAINT [PK_ProjectRatings] PRIMARY KEY CLUSTERED ([ProjectRatingsId]) ON [PRIMARY]
GO
